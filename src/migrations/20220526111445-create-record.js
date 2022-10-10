'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Records', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      streamId: {
        type: Sequelize.INTEGER
      },
      fileName: {
        type: Sequelize.STRING
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
    await queryInterface.addIndex('Records', { name: 'stream_id_idx', fields: ['streamId']} );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Records');
  }
};
