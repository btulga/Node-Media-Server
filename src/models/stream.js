'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Stream extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Stream.init({
    appCode: {
      type: DataTypes.STRING
    },
    streamPath: {
      type: DataTypes.STRING
    },
    startAt: {
      type: DataTypes.DATE
    },
    endAt: {
      type: DataTypes.DATE
    },
  }, {
    sequelize,
    modelName: 'Stream',
    indexes: [
      {
        name: 'app_code_idx',
        fields: ['appCode'],
      },
      {
        name: 'stream_path_idx',
        fields: ['streamPath'],
      },
    ],
  });
  return Stream;
};
