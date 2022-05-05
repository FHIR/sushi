function initialize(register, simple, complex) {
  register('afterExportFHIR', () => {
    return `simple: ${simple}\ncomplex: ${complex}`;
  });
}

module.exports = { initialize };
