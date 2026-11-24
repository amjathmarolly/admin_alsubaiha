"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Color } from "@tiptap/extension-color";
import { Placeholder } from "@tiptap/extension-placeholder";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Eraser,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Custom extension for Font Size
import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType,
      unsetFontSize: () => ReturnType,
    }
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
})

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, className }: RichEditorProps) {
  const isFirstRender = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg my-4' },
      }),
      Color,
      Placeholder.configure({
        placeholder: placeholder || "Start writing...",
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[400px] p-6 prose prose-sm max-w-none dark:prose-invert",
      },
      // Handle pasting HTML strings
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text && /<[a-z][\s\S]*>/i.test(text)) {
          // If the pasted text looks like HTML code, insert it as HTML
          editor?.commands.insertContent(text);
          return true; // Handle the paste ourselves
        }
        return false; // Let TipTap handle standard pasting
      },
    },
  });

  useEffect(() => {
    if (editor && isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className={`border border-border rounded-md bg-secondary animate-pulse ${className}`} style={{ height: '450px' }} />;
  }

  const handleToolbarAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
    editor.chain().focus().run();
  };

  const addLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.prompt("URL");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className={`flex flex-col border border-border rounded-md overflow-hidden bg-background ${className}`}>
      {/* Toolbar */}
      <div 
        className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 border-b border-border" 
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        
        {/* Format Select */}
        <Select 
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('blockquote') ? 'blockquote' : 'p'
          }
          onValueChange={(val) => {
            editor.chain().focus();
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'blockquote') editor.chain().focus().toggleBlockquote().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val.charAt(1)) as any }).run();
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="blockquote">Quote</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Family Select */}
        <Select 
          value={editor.getAttributes('textStyle').fontFamily || 'Montserrat'}
          onValueChange={(val) => editor.chain().focus().setFontFamily(val).run()}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Montserrat">Montserrat</SelectItem>
            <SelectItem value="Cormorant Garamond">Cormorant</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Courier New">Monospace</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Size Select */}
        <Select 
          value={editor.getAttributes('textStyle').fontSize || '16px'}
          onValueChange={(val) => editor.chain().focus().setFontSize(val).run()}
        >
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12px">Small</SelectItem>
            <SelectItem value="16px">Normal</SelectItem>
            <SelectItem value="20px">Large</SelectItem>
            <SelectItem value="24px">Huge</SelectItem>
            <SelectItem value="32px">Giant</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().toggleBold().run())}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted text-primary' : ''}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().toggleItalic().run())}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted text-primary' : ''}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().toggleUnderline().run())}
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted text-primary' : ''}`}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().setTextAlign('left').run())}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-muted text-primary' : ''}`}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().setTextAlign('center').run())}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-muted text-primary' : ''}`}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().setTextAlign('right').run())}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-muted text-primary' : ''}`}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().toggleBulletList().run())}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted text-primary' : ''}`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => handleToolbarAction(e, () => editor.chain().toggleOrderedList().run())}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-muted text-primary' : ''}`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button type="button" variant="ghost" size="sm" onClick={addLink} className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-muted text-primary' : ''}`}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={addImage} className="h-8 w-8 p-0">
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="flex-1" />
        
        <Button type="button" variant="ghost" size="sm" onClick={(e) => handleToolbarAction(e, () => editor.chain().undo().run())} disabled={!editor.can().undo()} className="h-8 w-8 p-0">
          <Undo className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={(e) => handleToolbarAction(e, () => editor.chain().redo().run())} disabled={!editor.can().redo()} className="h-8 w-8 p-0">
          <Redo className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={(e) => handleToolbarAction(e, () => editor.chain().unsetAllMarks().clearNodes().run())} className="h-8 w-8 p-0" title="Clear formatting">
          <Eraser className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .tiptap { outline: none !important; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin: 1rem 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin: 1rem 0; }
        .tiptap blockquote { border-left: 3px solid #ccc; padding-left: 1rem; font-style: italic; margin: 1rem 0; }
        .tiptap li { margin-bottom: 0.25rem; }
        .tiptap a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 0.5rem; }
      `}</style>
    </div>
  );
}
