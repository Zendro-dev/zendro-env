/**
 * Check whether the unknown object is null or undefined.
 * @param {unknown} x unknown object
 */
exports.isNullorUndefined = function (x) {
  return x === null || x === undefined;
};

/**
 * Check whether the unknown object is:
 * - empty object
 * - empty array
 * - empty string
 * - NaN
 * @param {unknown} x unknown object
 */
exports.isEmptyObject = function (x) {

  return typeof x === 'object' && Object.keys(x).length === 0;
};

/**
 * Check whether the unknown object is null, undefined, an empty object, or NaN.
 * @param {unknwon} x unknown object
 */
exports.isFalsy = function (x) {

  return exports.isNullorUndefined(x) || exports.isEmptyObject(x);
};
