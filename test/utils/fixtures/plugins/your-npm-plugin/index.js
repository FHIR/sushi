function initialize(register) {
  register('afterExportFHIR', () => {
    return "now it's yours";
  });
}

module.exports = { initialize };
