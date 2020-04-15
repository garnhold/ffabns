const Alexa = require('ask-sdk');

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

            builder.withShouldEndSession(null);

            await persistence.load(builder, requestType.isNewSession());
                await requestType.invokeHandler(persistence.getInstance());
            await persistence.save();

            return builder
                .getResponse();
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
            this.instance = createObjectFromTypedInfo(attributes.instance || {});

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
            instance: createTypedInfoFromObject(this.instance),
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
        if(Alexa.isNewSession(this.requestEnvelope))
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