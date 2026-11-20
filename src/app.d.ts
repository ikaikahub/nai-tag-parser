declare global {
    namespace App {
        interface Error {
            database?: boolean;
        }
    }
}

export {};
