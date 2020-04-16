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