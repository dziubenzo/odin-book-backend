// Get error message of the first validation error
export const getFirstErrorMsg = (errors) => {
  return errors.array({ onlyFirstError: true })[0].msg;
};

// Default category icon
export const defaultIcon =
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1716979473/odin_book/category_icons/cnngnuxrgf0kqkl8tnur.png';
