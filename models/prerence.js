module.exports = (sequelize, DataTypes) => {
  const Preference = sequelize.define('Preference', {
    alerta_caminhao: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    politicas_ambientais: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    dicas_descarte: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'preferencias_comunicacao',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Preference.associate = function(models) {
    Preference.belongsTo(models.User, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
  };

  return Preference;
};