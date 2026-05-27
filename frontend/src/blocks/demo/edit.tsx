export function Edit() {
  const blockProps = window.wp.blockEditor.useBlockProps();

  return (
    <div {...blockProps}>
      <p>Icon Base Demo Block (Editor)</p>
    </div>
  );
}
