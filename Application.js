const Alexa = require('ask-sdk-core');

let ArrayUtilities = {
    shuffle: function(array)
    {
        for(let i = array.length - 1; i >= 0; i--)
        {
            let temp = array[i];
            let index = Random.index(i);

            array[i] = array[index];
            array[index] = temp;
        }
    }
};
module.exports.ArrayUtilities = ArrayUtilities;

function PersistenceAdapter()
{
    const s3Adapter = require('ask-sdk-s3-persistence-adapter');

    return new s3Adapter.S3PersistenceAdapter({
        bucketName: process.env.S3_PERSISTENCE_BUCKET,
    });
}

function RequestHandler(cls)
{
    return {
        canHandle(handlerInput) {
            return true;
        },
        async handle(handlerInput)
        {
            let builder = handlerInput.responseBuilder;

            let requestType = new RequestType(handlerInput.requestEnvelope);
            let persistence = new Persistence(cls, handlerInput.attributesManager);

            console.log('Starting ' + requestType.getHandlerName() + ' Request');

            if(requestType.getHandlerName() === 'System.ExceptionEncountered')
                console.log('System exception encountered: ' + JSON.stringify(handlerInput.requestEnvelope.request.error));
            else
            {
                await persistence.load(builder, requestType.isNewSession());
                    await requestType.invokeHandler(persistence.getInstance());
                await persistence.save();
            }

            return builder.getResponse();
        }
    };
}

function ErrorHandler()
{
    return {
        canHandle() { return true; },
        handle(handlerInput, error) {
            console.log(`Error: ${error.stack}`);

            return handlerInput.responseBuilder
                .speak('An error has occurred.')
                .getResponse();
        }
    };
}

module.exports.createHandler = function(cls)
{
    return Alexa.SkillBuilders.custom()
        .withPersistenceAdapter(PersistenceAdapter())
        .addRequestHandlers(RequestHandler(cls))
        .addErrorHandlers(ErrorHandler())
        .lambda();
};

class Persistence
{
    constructor(cls, attributesManager)
    {
        this.cls = cls;
        this.attributesManager = attributesManager;
    }

    async load(builder, isNewSession)
    {
        let attributes = await this.attributesManager.getPersistentAttributes() || {};
        console.log('Loaded Persistence\n' + JSON.stringify(attributes));

        if(isNewSession)
            this.instance = new this.cls();
        else
            this.instance = createValueFromTypedInfo(attributes.instance || {});

        this.data = attributes.data || {};

        if((this.instance instanceof this.cls) === false)
        {
            if(isNewSession === false)
                await this.load(true);
            else
                throw new Error('Unable to create instance object of type ' + this.cls);
        }

        this.instance.builder = builder;
        if('wake' in this.instance)
            this.instance.wake();
    }

    async save()
    {
        delete this.instance.builder;

        let attributes = {
            instance: createTypedInfoFromValue(this.instance),
            data: this.data
        };

        this.attributesManager.setPersistentAttributes(attributes);
        await this.attributesManager.savePersistentAttributes();
        console.log('Saved Persistence\n' + JSON.stringify(attributes));
    }

    getInstance()
    {
        return this.instance;
    }

    getData()
    {
        return this.data;
    }
}

let Random = {
    percent: function()
    {
        return Math.random();
    },

    floatRange: function (a, b)
    {
        let low;
        let high;

        if(a < b)
        {
            low = a;
            high = b;
        }
        else
        {
            low = b;
            high = a;
        }

        return Random.percent() * (high - low) + low;
    },

    intRange: function(a, b)
    {
        return Math.floor(Random.floatRange(a, b));
    },

    index: function(length)
    {
        return Random.intRange(0, length);
    }
};
module.exports.Random = Random;

function getOwnFunctionNames(obj)
{
    return Object.getOwnPropertyNames(obj)
        .filter(p => typeof(obj[p]) === 'function');
}

class RequestType
{
    constructor(requestEnvelope)
    {
        this.requestEnvelope = requestEnvelope;
    }

    async invokeHandler(instance)
    {
        const handlerFunctionName = this.getHandlerFunctionName();

        if(handlerFunctionName in instance)
            await instance[handlerFunctionName]();
        else
            throw new Error('No ' + handlerFunctionName + ' exists in instance.');
    }

    isNewSession()
    {
        if(this.getHandlerName() === 'LaunchRequest')
            return true;

        return false;
    }

    getHandlerName()
    {
        let basicRequestType = Alexa.getRequestType(this.requestEnvelope);

        if(basicRequestType === 'IntentRequest')
            return Alexa.getIntentName(this.requestEnvelope);

        return basicRequestType;
    }

    getHandlerFunctionName()
    {
        return 'handle' + this.getHandlerName().replace(/[^A-Za-z0-9_]/g, '');
    }
}

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