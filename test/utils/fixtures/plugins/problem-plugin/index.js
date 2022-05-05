function initialize(register) {
  register('beforeFillTank', () => {
    return 'prepare the tank';
  });
  throw new Error('ran out of cookies');
}

module.exports = { initialize };
