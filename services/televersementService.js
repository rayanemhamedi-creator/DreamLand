import api from './api';

const televersementService = {
    televerserImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data.url;
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            throw new Error(errorMsg);
        }
    },

    televerserPlusieursImages: async (files) => {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        const response = await api.post('/upload/multiple', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};

export default televersementService;
