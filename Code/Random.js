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