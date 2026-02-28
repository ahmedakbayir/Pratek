import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Ticket, User } from 'lucide-react';

const MentionList = forwardRef(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (index) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="mention-dropdown">
        <div className="px-3 py-2 text-xs text-surface-400">Sonuc bulunamadi</div>
      </div>
    );
  }

  return (
    <div className="mention-dropdown">
      {items.map((item, index) => (
        <button
          key={item.id}
          className={`mention-dropdown-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => selectItem(index)}
        >
          {item.type === 'ticket' ? (
            <>
              <Ticket className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span className="font-mono text-primary-600">#{item.ticketId}</span>
              <span className="truncate text-surface-700">{item.label}</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center text-[10px] font-medium text-surface-600 shrink-0 overflow-hidden border border-surface-200">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt={item.label} className="w-full h-full object-cover" />
                ) : (
                  item.label?.charAt(0)
                )}
              </div>
              <span className="truncate text-surface-700">{item.label}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;
