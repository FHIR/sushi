import { getPuns, getRandomPun } from '../../src/utils';

const CLEAN_PUN = 'You are dolphinitely doing great!';
const WARN_PUN = 'Not bad, but you cod do batter!';
const ERR_PUN = 'This was a turtle disaster.';

describe('puns', () => {
  describe('#getPuns', () => {
    it('should get all puns when no arguments are provided', () => {
      const puns = getPuns();
      expect(puns).toContain(CLEAN_PUN);
      expect(puns).toContain(WARN_PUN);
      expect(puns).toContain(ERR_PUN);
    });

    it('should get only clean puns when asked for', () => {
      const puns = getPuns(false, false, true);
      expect(puns).toContain(CLEAN_PUN);
      expect(puns).not.toContain(WARN_PUN);
      expect(puns).not.toContain(ERR_PUN);
    });

    it('should get only warning puns when asked for', () => {
      const puns = getPuns(false, true, false);
      expect(puns).not.toContain(CLEAN_PUN);
      expect(puns).toContain(WARN_PUN);
      expect(puns).not.toContain(ERR_PUN);
    });

    it('should get only error puns when asked for', () => {
      const puns = getPuns(true, false, false);
      expect(puns).not.toContain(CLEAN_PUN);
      expect(puns).not.toContain(WARN_PUN);
      expect(puns).toContain(ERR_PUN);
    });

    it('should get no puns when none are asked for', () => {
      const puns = getPuns(false, false, false);
      expect(puns).toHaveLength(0);
    });
  });

  describe('#getRandomPun', () => {
    it('should get a clean run pun when there are no errors or warnings', () => {
      const pun = getRandomPun(0, 0);
      // a little fishy since it uses getPuns, but it still seems the best way
      expect(getPuns(false, false, true)).toContain(pun);
    });

    it('should get a warning pun when there are no errors but there are warnings', () => {
      const pun = getRandomPun(0, 1);
      // a little fishy since it uses getPuns, but it still seems the best way
      expect(getPuns(false, true, false)).toContain(pun);
    });

    it('should get an error pun when there are errors', () => {
      const pun = getRandomPun(1, 1);
      // a little fishy since it uses getPuns, but it still seems the best way
      expect(getPuns(true, false, false)).toContain(pun);
    });
  });
});
