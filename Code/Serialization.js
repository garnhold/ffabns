const typeFieldName = '#serializeTypeField#';
let classByName = {};

function createTypedInfoFromObject(obj)
{
    let typedInfo = {};

    for(let [key, value] of Object.entries(obj))
    {
        if(value !== null && typeof(value) === 'object')
            typedInfo[key] = createTypedInfoFromObject(value);
        else
            typedInfo[key] = value;
    }

    if(obj.constructor.name !== 'Object')
        typedInfo[typeFieldName] = obj.constructor.name;

    return typedInfo;
}

function createObjectFromTypedInfo(typedInfo)
{
    let obj;

    if(typeFieldName in typedInfo)
        obj = new classByName[typedInfo[typeFieldName]]();
    else
        obj = {};

    for(let [key, value] of Object.entries(typedInfo))
    {
        if(value !== null && typeof(value) === 'object')
            obj[key] = createObjectFromTypedInfo(value);
        else
            obj[key] = value;
    }

    return obj;
}

module.exports.registerClass = function(cls)
{
    classByName[cls.name] = cls;
};