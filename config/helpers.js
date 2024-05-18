// Get error message of the first validation error
export const getFirstErrorMsg = (errors) => {
  return errors.array({ onlyFirstError: true })[0].msg;
};