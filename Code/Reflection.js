function getOwnFunctionNames(obj)
{
    return Object.getOwnPropertyNames(obj)
        .filter(p => typeof(obj[p]) === 'function');
}