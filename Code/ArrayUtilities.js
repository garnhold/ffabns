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