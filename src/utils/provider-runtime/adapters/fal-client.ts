export interface FalRunOptions {
  model: string;
  prompt: string;
  image_size?: { width: number; height: number };
  seed?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  aspect_ratio?: string;
  output_format?: string;
  num_images?: number;
}

export interface FalResponse {
  url: string;
  width: number;
  height: number;
}

export class FalClient {
  private apiKey: string;
  private maxPolls: number;

  constructor(apiKey: string, maxPolls: number = 30) {
    this.apiKey = apiKey;
    this.maxPolls = maxPolls;
  }

  async run(options: FalRunOptions): Promise<FalResponse[]> {
    try {
      const endpoint = `https://queue.fal.run/${options.model}`;
      
      const payload: any = {
        prompt: options.prompt,
        num_images: options.num_images || 1,
      };

      if (options.image_size) payload.image_size = options.image_size;
      if (options.seed !== undefined) payload.seed = options.seed;
      if (options.guidance_scale !== undefined) payload.guidance_scale = options.guidance_scale;
      if (options.num_inference_steps !== undefined) payload.num_inference_steps = options.num_inference_steps;
      if (options.aspect_ratio) payload.aspect_ratio = options.aspect_ratio;
      if (options.output_format) payload.output_format = options.output_format;

      // 1. Submit Request
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Key ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) throw new Error("API chưa được cấu hình (Invalid API Key).");
      if (res.status === 429) throw new Error("Hệ thống đang bận, vui lòng thử lại.");
      if (res.status === 404) throw new Error(`Model hiện không khả dụng (${options.model}).`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Lỗi từ hệ thống AI (Status: ${res.status}): ${errorText}`);
      }

      const data = await res.json();
      if (!data.status_url) {
        // Fallback if the endpoint is not queue-based and returns immediately
        if (data.images && data.images.length > 0) {
          return data.images.map((img: any) => ({
            url: img.url,
            width: img.width,
            height: img.height
          }));
        }
        throw new Error("Không nhận được status_url từ hệ thống.");
      }

      // 2. Poll Result
      return await this.poll(data.status_url, data.request_id);

    } catch (e: any) {
      console.error("[FalClient Error]", e);
      throw e;
    }
  }

  private async poll(statusUrl: string, requestId: string): Promise<FalResponse[]> {
    let attempts = 0;
    while (attempts < this.maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every 1 second as requested
      attempts++;

      const res = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Authorization": `Key ${this.apiKey}`
        }
      });

      if (res.status === 401) throw new Error("API chưa được cấu hình (Invalid API Key).");
      if (res.status === 429) throw new Error("Hệ thống đang bận, vui lòng thử lại.");
      if (!res.ok) throw new Error(`Lỗi khi kiểm tra trạng thái ảnh (Status: ${res.status}).`);

      const data = await res.json();
      
      if (data.status === "COMPLETED") {
        if (data.response_url) {
          return await this.download(data.response_url);
        } else if (data.images) {
          return data.images.map((img: any) => ({ url: img.url, width: img.width, height: img.height }));
        } else if (data.payload?.images) {
          return data.payload.images.map((img: any) => ({ url: img.url, width: img.width, height: img.height }));
        } else {
          // If queue payload structure is slightly different
          const fetchRes = await fetch(`https://queue.fal.run/requests/${requestId}`, {
            headers: { "Authorization": `Key ${this.apiKey}` }
          });
          if (fetchRes.ok) {
            const finalData = await fetchRes.json();
            if (finalData.images) {
              return finalData.images.map((img: any) => ({ url: img.url, width: img.width, height: img.height }));
            }
          }
          throw new Error("Tạo ảnh thành công nhưng không tìm thấy dữ liệu ảnh.");
        }
      } else if (data.status === "FAILED") {
        throw new Error(`Quá trình tạo ảnh thất bại: ${data.error || "Lỗi không xác định từ hệ thống"}.`);
      }
      
      // IN_PROGRESS or IN_QUEUE: continue polling
    }

    throw new Error("Quá trình tạo ảnh mất nhiều thời gian hơn dự kiến. Vui lòng thử lại.");
  }

  private async download(responseUrl: string): Promise<FalResponse[]> {
    const res = await fetch(responseUrl, {
      headers: {
        "Authorization": `Key ${this.apiKey}`
      }
    });

    if (!res.ok) throw new Error(`Không thể lấy ảnh (Status: ${res.status}).`);
    
    const data = await res.json();
    if (data.images && data.images.length > 0) {
      return data.images.map((img: any) => ({
        url: img.url,
        width: img.width,
        height: img.height
      }));
    }
    
    throw new Error("Không tìm thấy dữ liệu ảnh trong kết quả trả về.");
  }
}
