module.exports = {
  // Método chamado ao rodar a migration (criação das tabelas)
  up: async (queryInterface, Sequelize) => {
    // Criação da tabela "usuarios"
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nome_completo: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      cpf: {
        type: Sequelize.STRING(14),
        allowNull: false,
        unique: true,
      },
      data_nascimento: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      senha: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Criação da tabela "enderecos"
    await queryInterface.createTable('enderecos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      cep: {
        type: Sequelize.STRING(9),
        allowNull: false,
      },
      logradouro: {
        type: Sequelize.STRING(100),
      },
      numero: {
        type: Sequelize.STRING(10),
      },
      complemento: {
        type: Sequelize.STRING(50),
      },
      bairro: {
        type: Sequelize.STRING(50),
      },
      cidade: {
        type: Sequelize.STRING(50),
      },
      estado: {
        type: Sequelize.STRING(2),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Criação da tabela "preferencias_comunicacao"
    await queryInterface.createTable('preferencias_comunicacao', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      alerta_caminhao: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      politicas_ambientais: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      dicas_descarte: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Adiciona índice único composto para garantir relacionamento 1:1
    await queryInterface.addIndex('preferencias_comunicacao', {
      fields: ['usuario_id'],
      unique: true,
      name: 'preferencias_usuario_unique'
    });

    console.log('Tabelas criadas com sucesso!');
  },

  // Método chamado ao desfazer a migration (remoção das tabelas)
  down: async (queryInterface) => {
    // Remove índices primeiro
    await queryInterface.removeIndex('preferencias_comunicacao', 'preferencias_usuario_unique');
    
    // Ordem reversa: remove primeiro as tabelas com dependências
    await queryInterface.dropTable('preferencias_comunicacao');
    await queryInterface.dropTable('enderecos');
    await queryInterface.dropTable('usuarios');
    
    console.log('Tabelas removidas com sucesso!');
  },
};