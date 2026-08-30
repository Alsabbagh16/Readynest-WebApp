import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Redo2, Undo2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BlogEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
    content: value,
    editorProps: { attributes: { class: 'min-h-[260px] px-4 py-3 focus:outline-none' } },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  if (!editor) return <div className="h-72 animate-pulse rounded-md border bg-slate-50" />;

  const setLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const href = window.prompt('Enter an http(s) URL', previous);
    if (href === null) return;
    if (!href) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const tool = (label, icon, action, active = false, disabled = false) => (
    <Button key={label} type="button" size="icon" variant={active ? 'default' : 'ghost'} aria-label={label} title={label} onClick={action} disabled={disabled}>{icon}</Button>
  );

  return <div className="overflow-hidden rounded-md border bg-white">
    <div className="flex flex-wrap gap-1 border-b bg-slate-50 p-2">
      {tool('Bold', <Bold className="h-4 w-4" />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {tool('Italic', <Italic className="h-4 w-4" />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {tool('Heading 2', <Heading2 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {tool('Heading 3', <Heading3 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
      {tool('Bullet list', <List className="h-4 w-4" />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {tool('Numbered list', <ListOrdered className="h-4 w-4" />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {tool('Add link', <LinkIcon className="h-4 w-4" />, setLink, editor.isActive('link'))}
      {tool('Remove link', <Unlink className="h-4 w-4" />, () => editor.chain().focus().unsetLink().run(), false, !editor.isActive('link'))}
      {tool('Undo', <Undo2 className="h-4 w-4" />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
      {tool('Redo', <Redo2 className="h-4 w-4" />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
    </div>
    <EditorContent editor={editor} />
  </div>;
};

export default BlogEditor;

