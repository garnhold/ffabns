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