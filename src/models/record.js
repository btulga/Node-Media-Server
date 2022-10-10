'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Record extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Record.belongsTo(models.Stream, {
        foreignKey: 'streamId',
        as: 'stream',
      });
    }
  };
  Record.init({
    fileName: {
      type: DataTypes.STRING
    },
  }, {
    sequelize,
    modelName: 'Record',
    indexes: [
      {
        name: 'stream_id_idx',
        fields: ['streamId'],
      },
    ],
  });
  return Record;
};
