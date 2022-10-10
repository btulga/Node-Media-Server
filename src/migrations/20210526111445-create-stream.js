'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Streams', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      appCode: {
        type: Sequelize.STRING
      },
      streamPath: {
        type: Sequelize.STRING
      },
      startAt: {
        type: Sequelize.DATE
      },
      endAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addIndex('Streams', { name: 'app_code_idx', fields: ['appCode']} );
    await queryInterface.addIndex('Streams', { name: 'stream_path_idx', fields: ['streamPath']} );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Streams');
  }
};
