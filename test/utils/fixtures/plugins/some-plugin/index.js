function initialize(register) {
  register('beforeFillTank', () => {
    return 'prepare the tank';
  });
}

module.exports = { initialize };
