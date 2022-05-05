async function initialize(register) {
  // a little bit of waiting is good
  const delay = new Promise(resolve => setTimeout(resolve, 250));
  await delay;
  register('beforeFillTank', () => {
    return 'prepare the tank';
  });
}

module.exports = { initialize };
