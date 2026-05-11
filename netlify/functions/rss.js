// 重複除去
    const uniqueItemsMap = new Map();
    const items = [];

    for (const item of allItems) {
      const normTitle = normalizeTitle(item.title);
      if (uniqueItemsMap.has(normTitle)) {
        const existing = uniqueItemsMap.get(normTitle);
        if (isImageLink(existing.link) && !isImageLink(item.link)) {
          existing.link  = item.link;
          existing.title = item.title;
        }
        continue;
      }
      uniqueItemsMap.set(normTitle, item);
      items.push(item);
    }

    // 【追加】件数を絞る前に、全体を最新の日付順に並び替える（ソースの偏りを防ぐ）
    items.sort((a, b) => {
      const dateA = new Date(a.published || 0).getTime();
      const dateB = new Date(b.published || 0).getTime();
      return dateB - dateA;
    });

    // 重複除去・並び替えが完了してからcountで件数を絞る
    if (items.length > count) items.splice(count);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' 
      },
      body: JSON.stringify(items)
    };
