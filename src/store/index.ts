import { defineStore } from 'pinia'
import { http, api } from '../modules/HttpClient'

export type AccountInfo = {
  accountId: number | string
  username: string
}

export const useMainStore = defineStore('mainStore', {
  state: () => {
    return {
      account: {} as AccountInfo,
    }
  },
  getters: {
    username: (state) => state.account.username,
  },
  actions: {
    // a demo
    async getAccountInfo() {
      try {
        let account = await http.get(api.ACCOUNT_INFO)
        if (!account) {
          account = {}
        }
        this.account = account as AccountInfo
        return account
      } catch (err) {
        console.error(err)
      }
    },
  },
})
