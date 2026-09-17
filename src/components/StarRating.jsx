import { For } from 'solid-js';
import Icon from './Icon';

const STAR_GREEN = '#1a9c4a';

export default function StarRating(props) {
  const size = () => props.size || 22;
  const interactive = () => typeof props.onChange === 'function';

  return (
    <div style="display:inline-flex;align-items:center;gap:2px" role={interactive() ? 'radiogroup' : undefined}>
      <For each={[1, 2, 3, 4, 5]}>
        {(n) => {
          const on = () => n <= props.value;
          const star = <Icon name={on() ? 'starFilled' : 'star'} size={size()} stroke={on() ? STAR_GREEN : '#c9c7c2'} weight={1.8} />;
          return interactive() ? (
            <button
              type="button"
              class="bn-tap"
              role="radio"
              aria-checked={props.value === n}
              aria-label={String(n)}
              onClick={() => props.onChange(props.value === n ? 0 : n)}
              style="display:flex;padding:2px"
            >
              {star}
            </button>
          ) : (
            <span style="display:flex">{star}</span>
          );
        }}
      </For>
    </div>
  );
}
