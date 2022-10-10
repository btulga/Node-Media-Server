//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./node_core_logger');

const EventEmitter = require('events');
const { spawn } = require('child_process');
const dateFormat = require('dateformat');
const mkdirp = require('mkdirp');
const fs = require('fs');
const { Stream, Record } = require('./models');
const {Op} = require("sequelize");
const os = require("os");
const moment = require("moment-timezone");

const isHlsFile = (filename) => filename.endsWith('.ts') || filename.endsWith('.m3u8')
const isTemFiles = (filename) => filename.endsWith('.mpd') || filename.endsWith('.m4s') || filename.endsWith('.tmp')

class NodeTransSession extends EventEmitter {
  constructor(conf) {
    super();
    this.isRunning = false;
    this.conf = conf;
    this.getConfig = (key = null) => {
      if (!key) return
      if (typeof this.conf != 'object') return
      if (this.conf.args && typeof this.conf.args === 'object' && this.conf.args[key]) return this.conf.args[key]
      return this.conf[key]
    }
  }

  async run() {
    if (this.isRunning) {
      console.log('---------- session already running --------------');
      return;
    }
    if (this.conf.mp4) {
      this.stream = await Stream.findOne({
        where: {
          streamPath: this.conf.streamPath,
          startAt: {
            [Op.lte]: new Date(),
          },
          endAt: {
            [Op.gt]: new Date(),
          }
        },
        order: [['startAt', 'DESC']],
      });
    }
    let vc = this.conf.vc || 'copy';
    let ac = this.conf.ac || 'copy';
    let inPath = 'rtmp://127.0.0.1:' + this.conf.rtmpPort + this.conf.streamPath;
    let ouPath = `${this.conf.mediaroot}/${this.conf.streamApp}/${this.conf.streamName}`;
    let mp4ouPath = `${this.conf.mp4root}/${this.conf.streamApp}/${this.conf.streamName}`;
    let mapStr = '';

    if (this.conf.rtmp && this.conf.rtmpApp) {
      if (this.conf.rtmpApp === this.conf.streamApp) {
        Logger.error('[Transmuxing RTMP] Cannot output to the same app.');
      } else {
        let rtmpOutput = `rtmp://127.0.0.1:${this.conf.rtmpPort}/${this.conf.rtmpApp}/${this.conf.streamName}`;
        mapStr += `[f=flv]${rtmpOutput}|`;
        Logger.log('[Transmuxing RTMP] ' + this.conf.streamPath + ' to ' + rtmpOutput);
      }
    }
    if (this.conf.mp4 && this.stream) {
      this.conf.mp4Flags = this.conf.mp4Flags ? this.conf.mp4Flags : '';
      let mp4FileName = dateFormat('yyyy-mm-dd-HH-MM-ss') + '.mp4';
      let mapMp4 = `${this.conf.mp4Flags}${mp4ouPath}/${mp4FileName}|`;
      mapStr += mapMp4;
      Logger.log('[Transmuxing MP4] ' + this.conf.streamPath + ' to ' + mp4ouPath + '/' + mp4FileName);
      // create record
      mkdirp.sync(mp4ouPath);
      // create record
      this.createRecord(this.stream.id, `${mp4ouPath}/${mp4FileName}`);
    }
    if (this.conf.hls) {
      this.conf.hlsFlags = this.getConfig('hlsFlags') || '';
      let hlsFileName = 'index.m3u8';
      let mapHls = `${this.conf.hlsFlags}${ouPath}/${hlsFileName}|`;
      mapStr += mapHls;
      Logger.log('[Transmuxing HLS] ' + this.conf.streamPath + ' to ' + ouPath + '/' + hlsFileName);
    }
    if (this.conf.dash) {
      this.conf.dashFlags = this.conf.dashFlags ? this.conf.dashFlags : '';
      let dashFileName = 'index.mpd';
      let mapDash = `${this.conf.dashFlags}${ouPath}/${dashFileName}`;
      mapStr += mapDash;
      Logger.log('[Transmuxing DASH] ' + this.conf.streamPath + ' to ' + ouPath + '/' + dashFileName);
    }
    if (mapStr === '') {
      // output not found
      return ;
    }
    mkdirp.sync(ouPath);
    let argv = ['-y', '-i', inPath];
    Array.prototype.push.apply(argv, ['-c:v', vc]);
    Array.prototype.push.apply(argv, this.conf.vcParam);
    Array.prototype.push.apply(argv, ['-c:a', ac]);
    Array.prototype.push.apply(argv, this.conf.acParam);
    Array.prototype.push.apply(argv, ['-f', 'tee', '-map', '0:a?', '-map', '0:v?', mapStr]);
    argv = argv.filter((n) => { return n; }); //去空

    //
    this.isRunning = true;

    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);
    this.ffmpeg_exec.on('error', (e) => {
      Logger.ffdebug(e);
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      Logger.ffdebug(`FF输出：${data}`);
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      Logger.ffdebug(`FF输出：${data}`);
    });

    this.ffmpeg_exec.on('close', (code) => {
      Logger.log('[Transmuxing end] ' + this.conf.streamPath);
      this.isRunning = false;
      this.emit('end');
      this.cleanTempFiles(ouPath)
      this.deleteHlsFiles(ouPath)
      //async combine mp4 files
      this.combineMp4Files();
    });
  }

  end() {
    if (this.ffmpeg_exec) {
      this.ffmpeg_exec.kill();
    }
  }

  // delete hls files
  deleteHlsFiles (ouPath) {
    if ((!ouPath && !this.conf.hls) || this.getConfig('hlsKeep')) return
    if (!this.conf.hls && !this.conf.dash) return
    fs.readdir(ouPath, function (err, files) {
      if (err) return
      files.filter((filename) => isHlsFile(filename)).forEach((filename) => {
        fs.unlinkSync(`${ouPath}/${filename}`);
      });
    });
  }

  // delete the other files
  cleanTempFiles (ouPath) {
    if (!ouPath) return
    if (!this.conf.hls && !this.conf.dash) return
    fs.readdir(ouPath, function (err, files) {
      if (err) return
      files.filter((filename) => isTemFiles(filename)).forEach((filename) => {
        fs.unlinkSync(`${ouPath}/${filename}`);
      });
    });
  }

  genRandom() {
    return  Math.random().toString(36).replace(/[^a-z]+/g, '');
  }

  createRecord(streamId, fileName) {
    return Record.create({
      streamId: streamId,
      fileName: fileName, // full path
    });
  }

  getStreamRecords(streamId) {
      return Record.findAll({
          where: {
              streamId: streamId,
          },
          order: [['createdAt', 'ASC']]
      }).then(results => {
          return results.map(record => record.fileName);
      });
  }

  async combineMp4Files() {
    if (!this.conf.mp4 || !this.stream) {
      return;
    }
    // mp4 ou path
    let mp4ouPath = `${this.conf.mp4root}/${this.conf.streamApp}/${this.conf.streamName}`;
    let mp4S3ouPath = this.conf.mp4S3root ? `${this.conf.mp4S3root}/${this.conf.streamApp}/${this.conf.streamName}` : null;

    // ouFile
    const fileName = moment(this.stream.startAt).tz('Asia/Ulaanbaatar').format('YYYY-MM-DD-HH-mm-00');
    const ouTmpFile = `${mp4ouPath}/${this.genRandom()}.mp4`;
    const ouFile = `${mp4ouPath}/cache-${fileName}.mp4`;
    // s3 storage path
    const ouS3File = this.conf.mp4S3root ? `${mp4S3ouPath}/cache-${fileName}.mp4`: null;
    // sync s3 folder
    if (this.conf.mp4S3root){
      mkdirp.sync(`${this.conf.mp4S3root}/${this.conf.streamApp}/${this.conf.streamName}`);
    }
    // mp4 file list
    let files = await this.getStreamRecords(this.stream.id);
    files = files.filter(path => fs.existsSync(path));

    const tmpFileList = `${os.tmpdir()}/${this.genRandom()}`;
    files.forEach(file => {
      fs.appendFileSync(tmpFileList, `file ${file}` + os.EOL);
    });

    let argv = [];
    Array.prototype.push.apply(argv, ['-f', 'concat']);
    Array.prototype.push.apply(argv, ['-safe', '0']);
    Array.prototype.push.apply(argv, ['-i', tmpFileList]);
    Array.prototype.push.apply(argv, ['-c', 'copy']);
    Array.prototype.push.apply(argv, ['-y', ouTmpFile]);
    //argv = argv.filter((n) => { return n });
    // execute ffmpeg command
    const ffmpeg_exec = spawn(this.conf.ffmpeg, argv, { shell: true });
    ffmpeg_exec.on('error', (e) => {
      Logger.ffdebug(e);
    });
    ffmpeg_exec.stdout.on('data', (data) => {
      Logger.ffdebug(`[ConcatRecord]：${data}`);
    });
    ffmpeg_exec.stderr.on('data', (data) => {
      Logger.ffdebug(`[ConcatRecord]：${data}`);
    });
    ffmpeg_exec.on('close', (code) => {
      Logger.log('[ConcatRecord] Closed:' + this.conf.streamPath);

      // rename to target file
      fs.renameSync(ouTmpFile, ouFile);

      // copy to s3 file system
      if (ouS3File) {
        fs.copyFileSync(ouFile, ouS3File);
      }
      // unlink file list
      fs.unlinkSync(tmpFileList);
    });
  }
}

module.exports = NodeTransSession;
