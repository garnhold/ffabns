const Application = require('Application');

const InstanceClass;

Application.registerClass(InstanceClass);

exports.handler = Application.createHandler(InstanceClass);