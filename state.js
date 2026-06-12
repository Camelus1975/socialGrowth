// App Founder Growth Suite - Central ES6 State Manager

export const state = {
  currentActiveApp: null,
  language: 'en',
  currentActiveView: 'founder-dash',
  activeMockupTheme: 'indigo',
  reviewFilterSentiment: 'all',
  roadmapVisibility: 'public',
  activeInboxThreadId: null,
  activeMediaFolder: 'all',
  activeReleaseTab: 'social',
  
  // Data cache
  appsData: {},
  customRoadmapItems: {},
  authState: {},
  inboxState: {},
  mediaState: {},
  calendarState: {},
  dbSchemaState: {},
  notificationsList: [],
  
  // Callbacks listeners map
  listeners: {},

  // Register state change listener
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  // Trigger state change events
  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  },

  // Mutator Actions
  setActiveApp(appId) {
    this.currentActiveApp = appId;
    this.trigger('appChanged', appId);
  },

  setActiveView(viewId) {
    this.currentActiveView = viewId;
    this.trigger('viewChanged', viewId);
  }
};
export default state;
