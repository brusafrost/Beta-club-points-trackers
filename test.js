const storage = `private static set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      this.syncToCloud();
    } catch (e) {
      console.warn('LocalStorage quota triggered.', e);
      // If quota reached, optimize submissions storage
    }
  }`;
console.log(storage.replace(/private static set<T>\([\s\S]*?\}\n  \}/m, "NEW_SET"));
