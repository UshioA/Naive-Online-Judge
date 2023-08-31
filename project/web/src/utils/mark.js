import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import rehypeHighlight from "rehype-highlight/lib";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSlug from "remark-slug";
import remarkToc from "remark-toc";
import CodeMirror from "@uiw/react-codemirror";
import "@uiw/codemirror-theme-github";
import "@uiw/codemirror-extensions-langs";
import "@uiw/codemirror-theme-github";
import {
  markdown,
  markdownKeymap,
  markdownLanguage,
} from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { Empty, Tabs } from "antd";
import { completeAnyWord } from "@codemirror/autocomplete";
import { useState } from "react";

const MarkView = ({ source, remarkPlugins, rehypePlugins }) => {
  return (
    <ReactMarkdown
      remarkPlugins={
        remarkPlugins || [remarkMath, remarkGfm, remarkSlug, remarkToc]
      }
      rehypePlugins={
        rehypePlugins || [
          rehypeKatex,
          [rehypeHighlight, { ignoreMissing: true }],
        ]
      }
      className="markdown-body"
      children={source}
    ></ReactMarkdown>
  );
};

const MarkEdit = ({ source, onChange, props }) => {
  return (
    <CodeMirror
      value={source}
      extensions={[
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          addKeymap: markdownKeymap,
        }),
        EditorView.lineWrapping,
      ]}
      options={{
        keyMap: "vscode",
        matchBrackets: true,
        tabSize: 2,
        theme: "github",
        mode: "markdown",
      }}
      height={props ? props.height : "auto"}
      onChange={onChange}
    />
  );
};

const Markdown = ({
  value,
  onChange,
  hidetab,
  tabPosition = "bottom",
  editProps,
  mode,
  remarkPlugins,
  rehypePlugins,
  style = {
    margin: "2em",
    padding: "1em",
    maxHeight: "600px",
    overflow: `auto`,
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "#778899",
    borderRadius: "15px",
  },
}) => {
  const [key, setKey] = useState(mode);

  return !key ? (
    <Empty />
  ) : (
    <Tabs
      hideAdd
      defaultActiveKey={key}
      items={[
        {
          key: "edit",
          label: "编辑",
          children: (
            <div style={style}>
              <MarkEdit source={value} onChange={onChange} props={editProps} />
            </div>
          ),
        },
        {
          key: "view",
          label: "预览",
          children: (
            <div style={style}>
              <MarkView
                source={value}
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
              />
            </div>
          ),
        },
      ]}
      tabPosition={tabPosition}
      renderTabBar={hidetab ? () => <></> : undefined}
    />
  );
};

export { MarkView, MarkEdit, Markdown };
