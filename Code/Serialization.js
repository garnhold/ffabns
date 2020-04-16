const typeFieldName = '#serializeTypeField#';
let classByName = {};

function createTypedInfoFromValue(value)
{
    if(value !== null)
    {
        if(Array.isArray(value))
            return createTypedInfoFromArray(value);

        if(typeof(value) === 'object')
        {
            if(value.constructor.name !== 'Object')
                return createTypedInfoFromObject(value);

            return createTypedInfoFromGenericObject(value);
        }
    }

    return value;
}
function createTypedInfoFromArray(array)
{
    let typedInfo = [];

    for(let i = 0; i < array.length; i++)
        typedInfo.push(createTypedInfoFromValue(array[i]));

    return typedInfo;
}
function createTypedInfoFromGenericObject(obj)
{
    let typedInfo = {};

    for(let [key, value] of Object.entries(obj))
        typedInfo[key] = createTypedInfoFromValue(value);

    return typedInfo;
}
function createTypedInfoFromObject(obj)
{
    let typedInfo = {};
    const className = obj.constructor.name;

    typedInfo[typeFieldName] = className;
    if((className in classByName) === false)
        throw new Error('The class ' + className + ' was not registered.');

    for(let [key, value] of Object.entries(obj))
        typedInfo[key] = createTypedInfoFromValue(value);

    return typedInfo;
}

function createValueFromTypedInfo(typedInfo)
{
    if(typedInfo !== null)
    {
        if(Array.isArray(typedInfo))
            return createArrayFromTypedInfo(typedInfo);

        if(typeof(typedInfo) === 'object')
        {
            if(typeFieldName in typedInfo)
                return createObjectFromTypedInfo(typedInfo);

            return createGenericObjectFromTypedInfo(typedInfo);
        }
    }

    return typedInfo;
}
function createArrayFromTypedInfo(typedInfo)
{
    let array = [];

    for(let i = 0; i < typedInfo.length; i++)
        array.push(createValueFromTypedInfo(typedInfo[i]));

    return array;
}
function createGenericObjectFromTypedInfo(typedInfo)
{
    let obj = {};

    for(let [key, value] of Object.entries(typedInfo))
        obj[key] = createValueFromTypedInfo(value);

    return obj;
}
function createObjectFromTypedInfo(typedInfo)
{
    const className = typedInfo[typeFieldName];
    if((className in classByName) === false)
        throw new Error('The class ' + className + ' is not registered.');

    let obj = new classByName[className]();

    for(let [key, value] of Object.entries(typedInfo))
        obj[key] = createValueFromTypedInfo(value);

    return obj;
}

module.exports.registerClass = function(cls)
{
    classByName[cls.name] = cls;
};