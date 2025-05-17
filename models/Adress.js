module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cep: {
      type: DataTypes.STRING(9),
      allowNull: false,
    },
    logradouro: DataTypes.STRING,
    numero: DataTypes.STRING,
    complemento: DataTypes.STRING,
    bairro: DataTypes.STRING,
    cidade: DataTypes.STRING,
    estado: DataTypes.STRING(2),
  }, {
    tableName: 'enderecos',
  });

  Address.associate = (models) => {
    Address.belongsTo(models.User, {
      foreignKey: 'usuario_id',
      as: 'usuario',
    });
  };

  return Address;
};