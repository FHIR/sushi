import YAML from 'yaml';
import { YAMLMap, Pair, Schema } from 'yaml/types';
import wordwrap from 'wordwrap';

const wrap = wordwrap(1, 100);

/**
 * A commented out pair. Solution suggested by author of the yaml library.
 * @see https://github.com/eemeli/yaml/issues/159
 */
export class CommentPair extends Pair {
  toString(ctx: Schema.StringifyContext, onComment?: () => void, onChompKeep?: () => void) {
    // @ts-ignore toString not properly types on Pair
    const str = super.toString(ctx, onComment, onChompKeep);
    return str.replace(new RegExp(`^(${ctx.indent})?`, 'gm'), '$&# ');
  }
}

/**
 * A YAMLMap with special support for adding "standalone" comments or pairs w/ comments
 */
export class CommentableYAMLMap extends YAMLMap {
  private commentQueue: string[];

  constructor() {
    super();
    this.commentQueue = [];
  }

  /**
   * Adds a key/value pair to the YAML document, optionally putting a comment before the pair
   * @param key - the key for the YAML pair to add
   * @param value - the value for the YAML pair to add
   * @param [comment] - and optional comment to put before the pair
   */
  addPair(key: string, value: any, comment?: string): Pair {
    // Need to make the key a node in order to add comments before the pair
    // See: https://github.com/eemeli/yaml/issues/157
    return this._addPair(new Pair(YAML.createNode(key), value), comment);
  }

  /**
   * Adds a commented out key/value pair to the YAML document, optionally putting a comment before
   * the commented out pair. This makes it easy for the user to add values in the future.
   * @param key - the key for the YAML pair to add (commented out)
   * @param value - the value for the YAML pair to add (commented out)
   * @param [comment] - and optional comment to put before the commented out pair
   */
  addCommentedOutPair(key: string, value: any, comment?: string) {
    // Need to make the key a node in order to add comments before the pair
    // See: https://github.com/eemeli/yaml/issues/157
    return this._addPair(new CommentPair(YAML.createNode(key), value), comment);
  }

  private _addPair(pair: Pair, comment?: string): Pair {
    if (comment) {
      this.addComment(comment);
    }

    // If there are any comments in the queue, they need to be applied before the pair's key
    if (this.commentQueue.length) {
      pair.key.commentBefore = this.commentQueue.join('\n');
      this.commentQueue.length = 0; // clear the queue
    }
    this.add(pair);
    return pair;
  }

  /**
   * Adds a comment with no associated pair.  Will get attached to the next pair added.
   * This means that if this is the last thing added to the map, it may get stranded.
   * @param comment - add a comment here (with no associated pair)
   */
  addComment(comment: string) {
    // Best way to do this right now is to append the comment to the last pair's value
    this.commentQueue.push(wrap(comment));
  }
}
