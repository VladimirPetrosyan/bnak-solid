import { splitProps } from 'solid-js';
import { pathFor, go } from '../store';

export default function Link(props) {
  const [local, rest] = splitProps(props, ['screen', 'active', 'legalId', 'href', 'navigate', 'onClick', 'children']);
  const href = () => local.href || pathFor({ screen: local.screen, active: local.active, legalId: local.legalId });

  const handleClick = (e) => {
    if (local.onClick) local.onClick(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    (local.navigate || (() => go(local.screen)))();
  };

  return (
    <a href={href()} onClick={handleClick} {...rest}>
      {local.children}
    </a>
  );
}
