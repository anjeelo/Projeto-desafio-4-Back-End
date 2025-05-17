module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome_completo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Nome completo é obrigatório',
        },
      },
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: false,
      unique: true,
      set(value) {
        // Remove formatação antes de salvar
        const cleanedValue = value.replace(/\D/g, '');
        this.setDataValue('cpf', cleanedValue);
      },
      validate: {
        len: {
          args: [11, 11],
          msg: 'CPF deve ter 11 dígitos'
        }
      }
    },
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        msg: 'Email já cadastrado'
      },
      validate: {
        isEmail: {
          msg: 'Email inválido'
        }
      }
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'usuarios',
    hooks: {
      // Removidos os hooks de hash de senha
      beforeCreate: async (user) => {
        // Nada a fazer aqui - senha será salva como texto puro
      },
      beforeUpdate: async (user) => {
        // Nada a fazer aqui - senha será salva como texto puro
      },
      beforeSave: async (user) => {
        // Nada a fazer aqui - senha será salva como texto puro
      }
    },
  });

  User.associate = (models) => {
    User.hasOne(models.Address, {
      foreignKey: 'usuario_id',
      as: 'endereco',
    });
    
    User.hasOne(models.Preference, {
      foreignKey: 'usuario_id',
      as: 'preferencias'
    });
  };

  return User;
};