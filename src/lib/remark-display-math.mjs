/**
 * Treat single-line `$$ … $$` as display math.
 * remark-math only makes a display block when `$$` sits on its own lines; `$$x$$` inside a line (as our MDX writes
 * it, indented inside <Deeper>/<Step>) becomes inline math, which squashes fractions and sums into the text line.
 * This marks those nodes with the `math-display` class that rehype-katex reads, so they render in display mode.
 */
export default function remarkDisplayMath() {
  return (tree, file) => {
    const src = String(file.value ?? '');
    const walk = (node) => {
      if (node.type === 'inlineMath' && node.position) {
        const start = node.position.start.offset;
        if (src.slice(start, start + 2) === '$$') {
          node.data ??= {};
          node.data.hName = 'code';
          node.data.hProperties = { className: ['language-math', 'math-display'] };
        }
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
  };
}
