import { IMicroblinkApi } from './microblinkApi.interface'
import { Observable } from 'rxjs/internal/Observable'
import { Observer } from 'rxjs/internal/types'
import { StatusCodes } from './microblink.types'

const DEFAULT_ENDPOINT = 'https://api.microblink.com'

/**
 * HTTP layer with Microblink API
 */
export default class MicroblinkApi implements IMicroblinkApi {
  private authorizationHeader = ''
  private endpoint: string
  private activeRequests: XMLHttpRequest[] = []

  constructor() {
    this.endpoint = DEFAULT_ENDPOINT
  }

  /**
   * Terminate request session with aborting all pending responses
   */
  TerminateAll(): void {
    this.activeRequests.forEach(activeRequest => {
      activeRequest.abort()
    })
    // Clear array of all active requests when every request is terminated (aborted)
    this.activeRequests = []
  }

  /**
   * Change authorization header value
   */
  SetAuthorization(authorizationHeader: string): void {
    this.authorizationHeader = authorizationHeader
  }

  /**
   * Change API endpoint
   */
  SetEndpoint(endpoint: string): void {
    this.endpoint = endpoint
  }

  /**
   * Execute remote recognition
   */
  Recognize(
    recognizers: string | string[],
    imageBase64: string,
    uploadProgress?: EventListener
  ): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
      // Image should be as Base64 encoded file
      const body: any = {
        imageBase64: imageBase64
      }

      // Recognizers could be one defined as string or multiple defined as string array
      if (typeof recognizers === 'string') {
        body['recognizer'] = recognizers
      } else {
        body['recognizers'] = recognizers
      }

      // Body data should be send as stringified JSON and as Content-type=application/json
      const data = JSON.stringify(body)

      const xhr = new XMLHttpRequest()

      xhr.withCredentials = true
      xhr.open('POST', this.endpoint + '/recognize/execute')
      xhr.setRequestHeader('Content-Type', 'application/json')

      // When Authorization header is not set results will be masked on server-side
      if (this.isAuthorizationHeaderValid) {
        xhr.setRequestHeader('Authorization', this.authorizationHeader)
      }

      xhr.addEventListener('readystatechange', function() {
        if (this.readyState === 4) {
          let data = null
          try {
            // Return result as parsed JSON object
            data = JSON.parse(this.responseText)
            observer.next(data)
            observer.complete()
          } catch (err) {
            data = {
              error: 'Result is not valid JSON',
              code: StatusCodes.ResultIsNotValidJSON,
              responseText: this.responseText
            }
            observer.error(data)
          }
        }
      })

      xhr.onerror = error => {
        observer.error(error)
      }

      if (uploadProgress) {
        xhr.upload.addEventListener('progress', uploadProgress, false)
      }

      xhr.send(data)

      // append the request to active stack
      this.activeRequests.push(xhr)
    })
  }

  /**
   * Authorization header validator
   */
  private get isAuthorizationHeaderValid() {
    if (this.authorizationHeader.startsWith('Bearer ')) {
      return true
    }
    return false
  }
}