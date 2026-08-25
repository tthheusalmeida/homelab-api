import { Injectable } from '@nestjs/common';

import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class VideoService {
  async download(
    url: string,
    destinationDir: string = 'D:/homelab/video',
    fileName: string = 'video-baixado.mp4',
  ): Promise<string> {
    // path.resolve lida automaticamente com diferenças de sistema operacional
    const outputPath = path.resolve(destinationDir, fileName);

    // Garante que a pasta de destino existe antes de criar o stream
    fs.mkdirSync(destinationDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(outputPath);

      // Remove o arquivo parcialmente baixado quando ocorre algum erro.
      const cleanup = () => {
        fileStream.close();

        fs.unlink(outputPath, () => {});
      };

      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const request = client.get(url, (response) => {
        // O vídeo pode estar hospedado em outro endereço.
        // Neste caso, segue o redirecionamento para continuar o download.
        if (
          response.statusCode !== undefined &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          // Libera o response atual porque ele não contém o vídeo.
          response.resume();

          this.download(response.headers.location, destinationDir, fileName)
            .then(resolve)
            .catch(reject);

          return;
        }

        if (response.statusCode !== 200) {
          cleanup();

          reject(
            new Error(`Falha ao baixar. Status Code: ${response.statusCode}`),
          );

          return;
        }

        // Envia o conteúdo da resposta diretamente para o arquivo.
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();

          console.log(`Download concluído! Salvo em: ${outputPath}`);

          resolve(outputPath);
        });

        fileStream.on('error', (error) => {
          cleanup();

          reject(
            new Error(`Erro ao salvar o vídeo: ${error.message}`, {
              cause: error,
            }),
          );
        });
      });

      request.on('error', (error) => {
        cleanup();

        reject(
          new Error(`Erro durante o download: ${error.message}`, {
            cause: error,
          }),
        );
      });
    });
  }
}
