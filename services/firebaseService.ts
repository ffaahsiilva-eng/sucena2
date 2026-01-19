
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, onDisconnect, serverTimestamp, get, Database } from 'firebase/database';

/**
 * CONFIGURAÇÃO DO FIREBASE
 * IMPORTANTE: Para que a sincronização funcione, você deve:
 * 1. Criar um projeto no Console do Firebase (https://console.firebase.google.com/)
 * 2. Ativar o 'Realtime Database' nas opções de Build.
 * 3. Copiar as credenciais reais e substituir os placeholders abaixo.
 */
const firebaseConfig = {
  apiKey: "AIzaSy-SUCENA-DEMO-KEY-VALID", // Substitua por sua chave real
  authDomain: "painel-sucena.firebaseapp.com",
  databaseURL: "https://painel-sucena-default-rtdb.firebaseio.com", // Substitua pela sua URL real do Database
  projectId: "painel-sucena",
  storageBucket: "painel-sucena.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let db: Database | null = null;
let app: FirebaseApp | null = null;

const initFirebase = () => {
    try {
        // Verifica se a config é válida (não é o placeholder padrão)
        if (firebaseConfig.apiKey.includes("PLACEHOLDER")) {
            console.warn("Firebase operando em modo offline. Configure as chaves reais em firebaseService.ts.");
            return null;
        }

        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getDatabase(app);
        return db;
    } catch (e) {
        console.error("Erro crítico na inicialização do Firebase Cloud:", e);
        return null;
    }
};

// Inicializa imediatamente
db = initFirebase();

export const FirebaseService = {
  get db() {
      return db;
  },
  
  // Salvar dado (sobrescrever um caminho inteiro)
  async save(path: string, data: any) {
    if (!db) return;
    try {
        await set(ref(db, path), data);
    } catch (e) {
        console.error(`Erro ao salvar na nuvem (${path}):`, e);
    }
  },

  // Adicionar à uma lista (gera ID único)
  async addToList(path: string, data: any) {
    if (!db) return;
    try {
        const newListRef = push(ref(db, path));
        return set(newListRef, { ...data, serverTime: serverTimestamp() });
    } catch (e) {
        console.error(`Erro ao adicionar à lista na nuvem (${path}):`, e);
    }
  },

  // Escutar mudanças em tempo real (Subscription)
  subscribe(path: string, callback: (data: any) => void) {
    if (!db) return () => {};
    try {
        const dataRef = ref(db, path);
        return onValue(dataRef, (snapshot) => {
            callback(snapshot.val());
        }, (error) => {
            console.error(`Erro na assinatura Firebase (${path}):`, error);
        });
    } catch (e) {
        console.error(`Falha ao assinar caminho (${path}):`, e);
        return () => {};
    }
  },

  // Buscar dado uma única vez
  async fetchOnce(path: string) {
    if (!db) return null;
    try {
        const snapshot = await get(ref(db, path));
        return snapshot.exists() ? snapshot.val() : null;
    } catch (e) {
        console.error(`Erro ao buscar dados na nuvem (${path}):`, e);
        return null;
    }
  },

  // Sistema de Presença (Indica quem está com o app aberto)
  setUserOnline(userId: string, userData: any) {
    if (!db) return;
    try {
        const userRef = ref(db, `status/${userId}`);
        // Ao conectar
        set(userRef, { 
            ...userData, 
            lastSeen: serverTimestamp(), 
            online: true 
        });
        // Ao desconectar (fechar aba ou perder internet)
        onDisconnect(userRef).set({ 
            ...userData, 
            lastSeen: serverTimestamp(), 
            online: false 
        });
    } catch (e) {
        console.error("Erro ao configurar sistema de presença:", e);
    }
  }
};
