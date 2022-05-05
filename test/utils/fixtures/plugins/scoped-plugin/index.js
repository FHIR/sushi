function initialize(register) {
  register('afterExportFHIR', () => {
    return "that's the scope";
  });
}

module.exports = { initialize };
