class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // original jonas solution
    //  copy of the query object to remove special attribues like 'page', 'sort' .... (because at some point the query will be api/tours?duration=5&sort=asc&page=3 to output an ascensing sort and page 3 of the results....) but of course 'page' and 'sort' are not part of the Tour model and should not be passed into the mongoose query

    // // another solution in ES6
    // // const { page, sort, limit, fields, ...queryObj } = req.query;

    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1b- advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      // console.log(sortBy);
      this.query = this.query.sort(sortBy);
      //to sort along different fields in mongoose
      // sort('price ratingsAverage')
    } else {
      this.query = this.query.sort('-createdAt _id');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const filterBy = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(filterBy);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
