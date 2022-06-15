// see video 115 in Node.JS bootcamp from Jonas.
// 'Catching errors in async functions'
// https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15065210#questions/9041656
// https://itnext.io/error-handling-with-async-await-in-js-26c3f20bc06a
module.exports = (fn) => {
  // we use a promise that the fn method returns
  return (req, res, next) => {
    // console.log('About to execute method fn in catchAsync');
    fn(req, res, next).catch(next);
  };
};
