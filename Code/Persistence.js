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