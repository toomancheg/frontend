"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";

import styles from "./TheoryMarkdown.module.css";

function normalizeLatexDelimiters(value: string): string {
  return value
    .replace(/\\\[([\s\S]+?)\\\]/g, "$$$$1$$$$")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$$$1$");
}

type Props = {
  markdown: string;
  className?: string;
};

export function TheoryMarkdown({ markdown, className }: Props) {
  return (
    <div className={className ?? styles.wrap}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className={styles.p}>{children}</p>,
          ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
          li: ({ children }) => <li className={styles.li}>{children}</li>,
          h1: ({ children }) => <h3 className={styles.h}>{children}</h3>,
          h2: ({ children }) => <h3 className={styles.h}>{children}</h3>,
          h3: ({ children }) => <h4 className={styles.h3}>{children}</h4>,
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = Boolean(codeClass?.includes("language-"));
            if (isBlock) {
              return (
                <pre className={styles.pre}>
                  <code {...props} className={codeClass}>
                    {children}
                  </code>
                </pre>
              );
            }
            return <code className={styles.inlineCode}>{children}</code>;
          },
        }}
      >
        {normalizeLatexDelimiters(markdown)}
      </ReactMarkdown>
    </div>
  );
}
