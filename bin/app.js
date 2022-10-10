#!/usr/bin/env node
require('dotenv').config();
const { MEDIA_ROOT, WEB_ROOT, FFMPEG, API_USER, API_PASS, RTMP_PORT, HTTP_PORT, MP4_ROOT, MP4_S3_ROOT } = process.env;

const NodeMediaServer = require('..');
let argv = require('minimist')(process.argv.slice(2),
  {
    string:['rtmp_port','http_port','https_port'],
    alias: {
      'rtmp_port': 'r',
      'http_port': 'h',
      'https_port': 's',
    },
    default:{
      'rtmp_port': RTMP_PORT,
      'http_port': HTTP_PORT,
      'https_port': 8443,
    }
  });

if (argv.help) {
  console.log('Usage:');
  console.log('  node-media-server --help // print help information');
  console.log('  node-media-server --rtmp_port 1935 or -r 1935');
  console.log('  node-media-server --http_port 8000 or -h 8000');
  console.log('  node-media-server --https_port 8443 or -s 8443');
  process.exit(0);
}

const config = {
  rtmp: {
    port: argv.rtmp_port,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: argv.http_port,
    mediaroot: MEDIA_ROOT,
    webroot: WEB_ROOT,
    allow_origin: '*',
    api: true
  },
  auth: {
    api: true,
    api_user: API_USER,
    api_pass: API_PASS,
    play: false,
    publish: false,
    secret: 'nodemedia2017privatekey'
  },
  trans: {
    ffmpeg: FFMPEG,
    tasks: [
      {
        app: 'live',
        // audio encode
        ac: "aac",
        acParam: ['-ab', '64k', '-ac', '1', '-ar', '44100'],
        // apple live stream
        hls: true,
        hlsFlags: '[hls_time=5:hls_list_size=5:hls_flags=delete_segments]',
        // dash live stream
        dash: true,
        dashFlags: '[f=dash:seg_duration=5:window_size=5:extra_window_size=5]',
      },
      // seperate record task
      {
        app: 'live',
        mp4: true,
        mp4Flags: '[movflags=frag_keyframe+empty_moov]',
        mp4root: MP4_ROOT,
        mp4S3root: MP4_S3_ROOT,
      }
    ],
  },
  fission: {
    ffmpeg: FFMPEG,
    tasks: [
      {
        rule: "live/*",
        model: [
          {
            ab: "96k",
            vb: "1000k",
            vs: "854x480",
            vf: "24",
          }
        ]
      }
    ]
  },
};


let nms = new NodeMediaServer(config);
nms.run();

nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

