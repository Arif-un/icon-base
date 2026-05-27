export function Save() {
  const blockProps = window.wp.blockEditor.useBlockProps.save();

  return (
    <div {...blockProps}>
      <p>Icon Base Demo Block</p>
    </div>
  );
}
