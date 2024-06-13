// Get error message of the first validation error
export const getFirstErrorMsg = (errors) => {
  return errors.array({ onlyFirstError: true })[0].msg;
};

// Default category icon
export const defaultCategoryIcon =
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1716979473/odin_book/category_icons/cnngnuxrgf0kqkl8tnur.png';

// Default avatars
export const defaultAvatars = [
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/b0heqsns8cpkyjzm1bsd.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/dfmwqquwvyavf4v31wcg.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/kqrc0rjjpz18d0rz0lhw.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/cpwima9dqagdfywemsop.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/mxppgtj6ahub99iimrii.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/d8lormu9xhhiyendqm0v.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111759/odin_book/avatars/default/kvvaddcwsv0at8xdkunu.png',
  'https://res.cloudinary.com/dvhkp9wc6/image/upload/v1718111758/odin_book/avatars/default/akap5kaki53sgmkhqekz.png',
];

// Return a random default avatar
export const getRandomAvatar = () => {
  const index = Math.floor(Math.random() * defaultAvatars.length);
  return defaultAvatars[index];
};
